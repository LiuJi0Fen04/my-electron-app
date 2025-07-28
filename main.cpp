#include <windows.h>
#include <iostream>
#include <opencv2/opencv.hpp>
#include <functional>
#include <variant>
#include <vector>
#include <string>
#include <memory>
// Forward declare control flow structs to resolve circular dependency with Instruction
struct IfBlock;
struct ForLoop;
struct WhileLoop;

// Instruction variant
using Instruction = std::variant<
    struct FunctionCall,
    std::unique_ptr<IfBlock>,
    std::unique_ptr<ForLoop>,
    std::unique_ptr<WhileLoop>
>;

// FunctionCall struct
struct FunctionCall {
    std::string name;
    std::vector<void*> args; 
};

// IfBlock struct
struct IfBlock {
    std::function<bool()> condition;
    std::vector<Instruction> thenBranch; // CHANGED: Now holds Instructions, allowing nesting
    std::vector<Instruction> elseBranch; // CHANGED: Now holds Instructions, allowing nesting

    // Constructor to conveniently initialize members
    IfBlock(std::function<bool()> cond, std::vector<Instruction> thenB, std::vector<Instruction> elseB = {})
        : condition(std::move(cond)), thenBranch(std::move(thenB)), elseBranch(std::move(elseB)) {
    }
};

// ForLoop struct
struct ForLoop {
    int start, end, step;
    std::function<void(int)> onIter; // optional hook, (easily pass lambdas with capturesm which are crucial in DSL like designs)
    std::vector<Instruction> body;
};

// WhileLoop struct
struct WhileLoop {
    std::function<bool()> condition; // A function that returns true to continue, false to stop
    std::vector<Instruction> body;  // The instructions to execute in each iteration

    // A convenient constructor
    WhileLoop(std::function<bool()> cond, std::vector<Instruction> b) : condition(std::move(cond)), body(std::move(b)) {}
};



// The type for the dispatched function from the DLL
typedef int (*CallFunc)(const char*, void**, int);

// Returns a pair containing the function pointer and the library handle for proper cleanup.
std::pair<CallFunc, HMODULE> loadDispatcher(const char* dllName) {
    HMODULE h = LoadLibraryA(dllName);
    if (!h) {
        std::cerr << "Failed to load DLL: " << dllName << "\n";
        return { nullptr, nullptr };
    }
    auto func = (CallFunc)GetProcAddress(h, "call");
    if (!func) {
        std::cerr << "Failed to find 'call' function in DLL.\n";
        FreeLibrary(h); // Clean up since we failed
        return { nullptr, nullptr };
    }
    // Return both the function and the handle
    return { func, h };
}

// Forward declare execute for recursion
void execute(const std::vector<Instruction>& pipeline, CallFunc call);


//  [Instruction]
//  |
//  v
//  [std::visit dispatch]
//  |
//  +-- > FunctionCall-- > call(...)
//  |
//  +-- > IfBlock-- > condition() ? then : else -- > execute(...)
//  |
//  +-- > ForLoop-- > for (...) { onIter(); execute(...) }
//  |
//  +-- > WhileLoop-- > for (...) { onIter(); execute(...) }
void execute_instruction(const Instruction& node, CallFunc call) {
    //    Syntax    Category	            Meaning
    //    T&        Lvalue reference	    Refers to named objects with identity
    //    T&&       Rvalue reference	    Refers to temporaries or move targets
    //    auto&&    Universal reference	    Can bind to both lvalues and rvalues
    // Use std::visit for a clean, modern, and safe way to handle the variant
    std::visit([call](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, FunctionCall>) {
            // Case 1: FunctionCall
            call(arg.name.c_str(), (void**)arg.args.data(), (int)arg.args.size());
        }
        else if constexpr (std::is_same_v<T, std::unique_ptr<IfBlock>>) {
            // Case 2: IfBlock
            const auto& b = *arg; // Get reference to the IfBlock
            const auto& branch = b.condition() ? b.thenBranch : b.elseBranch;
            execute(branch, call); // Recurse on the chosen branch
        }
        else if constexpr (std::is_same_v<T, std::unique_ptr<ForLoop>>) {
            // Case 3: ForLoop
            const auto& l = *arg; // Get reference to the ForLoop
            for (int i = l.start; i < l.end; i += l.step) {
                if (l.onIter) {
                    l.onIter(i); // Execute the per-iteration hook
                }
                execute(l.body, call); // Execute the loop body
            }
        }
        else if constexpr (std::is_same_v<T, std::unique_ptr<WhileLoop>>) {
            // Case 4: While Loop
            const auto& w = *arg; // get a reference to the whileloop object
            while (w.condition()) {
                execute(w.body, call);
            }
        }
    }, node);
}

void execute(const std::vector<Instruction>& pipeline, CallFunc call) {
    if (!call) {
        std::cerr << "Cannot execute pipeline with an invalid dispatch function." << std::endl;
        return;
    }
    for (const auto& instruction : pipeline) {
        execute_instruction(instruction, call);
    }
}

// =================================================================
// THE IMPROVEMENT: A helper function to build instrtuction lists
// =================================================================
// this variadic template fucntion takes any number of arguments,
// constructs Instructions from them, and returns them in a std::vector
template<typename... T> // this is a template parameter pack, ... this makes it a 'pack', it signifies that T is not a single type, but a placeholder for zero or move types
std::vector<Instruction> make_pipeline(T&&... args) { // this is a forward reference(sometimes called a "universal reference") combined with a function parameter pack
    std::vector<Instruction> pipeline;
    // reserve memory in advance to prevent reallocations(key optimization). Tells the vector to pre-allocate enough memory to hold at least that many elements
    // memory reallocation can be an expensive operation
    pipeline.reserve(sizeof...(args));
    // use a C++17 binary fold expression to emplace each argument into the vector 
    // this is efficient and correctly handles move-only types
    (pipeline.emplace_back(std::forward<T>(args)), ...);
    return pipeline;
}

int main() {
    auto [dispatcher , hLib] = loadDispatcher("D:\\vs_project\\alg_dll\\x64\\Release\\alg_dll.dll");
    if (!dispatcher) {
        std::cerr << "Failed to get function\n";
        return 1;
    }

    cv::Mat input = cv::imread("D:\\image\\paixianbuliang\\Number2603Time0518140910180.bmp");
    if (input.empty()) {
        std::cerr << "Failed to read input.jpg\n";
        return 1;
    }

    // -----------------------------------------------------------------------------------------------------------------------------------------------

    cv::Mat out1, out2, result_while;
    int ksize = 3;
    double thresh = 100.0, maxval = 255.0;

    void* blurArgs[] = { &input, &out1, &ksize };
    void* threshArgs[] = { &input, &out2, &thresh, &maxval };

    FunctionCall blurCall = { "blur", { blurArgs[0], blurArgs[1], blurArgs[2] } };
    FunctionCall threshCall = { "threshold", { threshArgs[0], threshArgs[1], threshArgs[2], threshArgs[3] } };

    int width = 400, height = 300;
    FunctionCall resizeCall = { "resize", { &input, &result_while, &width, &height } };

    std::vector<Instruction> pipeline;
    pipeline.emplace_back(blurCall);
    pipeline.emplace_back(threshCall); 
    pipeline.emplace_back(std::make_unique<IfBlock>(
        // Condition: Check image width
        [&input]() {
            std::cout << "Condition: Is image width (" << input.cols << ") > 500? "
                << (input.cols > 500 ? "Yes." : "No.") << std::endl;
            return input.cols > 500;
        },
        make_pipeline(blurCall),
        make_pipeline(threshCall)

    ));

    // =======================================================
    // NEW: Add a WhileLoop to the pipeline
    // =======================================================
    int countdown = 3;
    pipeline.emplace_back(std::make_unique<WhileLoop>(
        [&countdown]() {
            bool should_continue = countdown > 0;
            std::cout << "[WHILE Check] Countdown is " << countdown
                << ". The loop will " << (should_continue ? "continue." : "stop.")
                << std::endl;
            countdown--; // Decrement for the next check
            return should_continue;
        },
        make_pipeline(resizeCall)
    ));
    execute(pipeline, dispatcher);

    cv::namedWindow("Input Image", cv::WINDOW_KEEPRATIO);
    cv::imshow("Input Image", out2);
    cv::waitKey(0);

    FreeLibrary(hLib);
    return 0;
}